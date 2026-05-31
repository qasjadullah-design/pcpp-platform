require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { connectDB, sequelize } = require('../src/config/database');
const { User, Project } = require('../src/models');

const VALID_PROVINCES = new Set([
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
  'Islamabad Capital Territory',
]);

const IMPORT_TAG = 'bulk_import_2026_adp_psdp';

function getArg(name, defaultValue = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.text) return String(value.text).trim();
    if (value.richText) return value.richText.map(x => x.text || '').join('').trim();
    if (value.result !== undefined) return String(value.result).trim();
  }
  return String(value).trim();
}

function parseAmountMillion(value) {
  const raw = cellToString(value).replace(/,/g, '');
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function normalizeHeader(header) {
  return cellToString(header).replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '_').trim();
}

function normalizeProvince(value) {
  const raw = cellToString(value);
  const map = {
    kp: 'Khyber Pakhtunkhwa',
    kpk: 'Khyber Pakhtunkhwa',
    'khyber pakhtunkhwa': 'Khyber Pakhtunkhwa',
    punjab: 'Punjab',
    sindh: 'Sindh',
    balochistan: 'Balochistan',
    'gilgit baltistan': 'Gilgit-Baltistan',
    'gilgit-baltistan': 'Gilgit-Baltistan',
    gb: 'Gilgit-Baltistan',
    ajk: 'Azad Jammu and Kashmir',
    'azad jammu and kashmir': 'Azad Jammu and Kashmir',
    ict: 'Islamabad Capital Territory',
    islamabad: 'Islamabad Capital Territory',
    'islamabad capital territory': 'Islamabad Capital Territory',
  };
  return map[raw.toLowerCase()] || raw;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(field);
      if (row.some(v => cellToString(v) !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    if (row.some(v => cellToString(v) !== '')) rows.push(row);
  }

  return rows;
}

async function loadRows(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.csv') {
    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCsv(content);
    if (!rows.length) throw new Error('CSV file is empty.');
    const headers = rows[0].map(normalizeHeader);
    return rows.slice(1).map((row, index) => {
      const record = { rowNumber: index + 2 };
      headers.forEach((header, colIndex) => {
        record[header] = row[colIndex] || '';
      });
      return record;
    });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet('projects') || workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found in Excel file.');

  const headerRow = sheet.getRow(1);
  const columns = {};
  headerRow.eachCell((cell, colNumber) => {
    columns[normalizeHeader(cell.value)] = colNumber;
  });

  const required = ['province', 'district', 'title', 'funding_type', 'funding_amount'];
  const missing = required.filter(col => !columns[col]);
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  const records = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    records.push({
      rowNumber,
      province: row.getCell(columns.province).value,
      district: row.getCell(columns.district).value,
      title: row.getCell(columns.title).value,
      funding_type: row.getCell(columns.funding_type).value,
      funding_amount: row.getCell(columns.funding_amount).value,
    });
  }
  return records;
}

async function getOwnerUser(ownerEmail) {
  let owner = await User.findOne({ where: { email: ownerEmail } });
  if (owner) return owner;

  owner = await User.findOne({ where: { role: 'admin' }, order: [['created_at', 'ASC']] });
  if (owner) return owner;

  throw new Error(`No owner user found. Tried owner email: ${ownerEmail}, then first admin user.`);
}

async function main() {
  const filePath = getArg('file', path.join(__dirname, 'data', 'pcpp_projects_import_master.csv'));
  const ownerEmail = getArg('owner-email', 'admin@pcpp.gov.pk');
  const limit = Number(getArg('limit', '0')) || 0;
  const dryRun = hasFlag('dry-run');
  const replaceImported = hasFlag('replace-imported');
  const status = getArg('status', 'draft');

  if (!['draft', 'under_review', 'approved'].includes(status)) {
    throw new Error('Invalid --status value. Use draft, under_review, or approved.');
  }

  console.log('PCPP ADP/PSDP import started');
  console.log(`File: ${filePath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN - file validation only, no database connection' : 'LIVE DATABASE INSERT'}`);
  console.log(`Limit: ${limit || 'all rows'}`);
  console.log(`Status for imported projects: ${status}`);

  let owner = null;
  if (!dryRun) {
    await connectDB();
    owner = await getOwnerUser(ownerEmail);
    console.log(`Owner user: ${owner.email} (${owner.id})`);

    if (replaceImported) {
      const deleted = await Project.destroy({
        where: {
          tags: { [Op.contains]: [IMPORT_TAG] },
        },
      });
      console.log(`Deleted previous imported rows with tag ${IMPORT_TAG}: ${deleted}`);
    }
  }

  const records = await loadRows(filePath);

  const required = ['province', 'district', 'title', 'funding_type', 'funding_amount'];
  const firstRecord = records[0] || {};
  const missing = required.filter(col => !(col in firstRecord));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  let scanned = 0;
  let valid = 0;
  let inserted = 0;
  let skippedBlankTitle = 0;
  let skippedInvalidProvince = 0;
  let skippedInvalidAmount = 0;
  let skippedDuplicate = 0;
  const errors = [];
  const seenInFile = new Set();

  const transaction = dryRun ? null : await sequelize.transaction();

  try {
    for (const record of records) {
      if (limit && valid >= limit) break;

      scanned++;

      const title = cellToString(record.title);
      const province = normalizeProvince(record.province);
      const district = cellToString(record.district);
      const fundingType = cellToString(record.funding_type);
      const amountMillion = parseAmountMillion(record.funding_amount);

      if (!title) {
        skippedBlankTitle++;
        continue;
      }
      if (!VALID_PROVINCES.has(province)) {
        skippedInvalidProvince++;
        errors.push({ rowNumber: record.rowNumber, title, province, error: 'Invalid province' });
        continue;
      }
      if (amountMillion === null) {
        skippedInvalidAmount++;
        errors.push({ rowNumber: record.rowNumber, title, funding_amount: cellToString(record.funding_amount), error: 'Invalid funding amount' });
        continue;
      }

      valid++;

      const duplicateKey = `${title}||${province}||${district}`.toLowerCase();
      if (seenInFile.has(duplicateKey)) {
        skippedDuplicate++;
        continue;
      }
      seenInFile.add(duplicateKey);

      if (!dryRun) {
        const existing = await Project.findOne({
          where: { title, province, district },
          transaction,
        });
        if (existing) {
          skippedDuplicate++;
          continue;
        }
      }

      const totalCostPkr = Math.round(amountMillion * 1_000_000);

      const projectPayload = {
        title,
        abstract: title,
        description: null,
        province,
        district,
        primary_sector: 'Other',
        status,
        currency: 'PKR',
        total_cost: totalCostPkr,
        funding_gap: totalCostPkr,
        organization_name: `${province} Government`,
        user_id: owner ? owner.id : 'DRY_RUN_OWNER_ID',
        impact_metrics: {
          source: 'ADP/PSDP bulk import',
          funding_type: fundingType,
          funding_amount_million: amountMillion,
          funding_amount_pkr: totalCostPkr,
          import_batch: IMPORT_TAG,
        },
        tags: [IMPORT_TAG, `province:${province}`, `funding_type:${fundingType || 'unknown'}`],
      };

      if (!dryRun) {
        await Project.create(projectPayload, { transaction });
        inserted++;
      }
    }

    if (!dryRun) await transaction.commit();
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }

  console.log('\nImport summary');
  console.log('--------------');
  console.log(`Rows scanned: ${scanned}`);
  console.log(`Valid rows considered: ${valid}`);
  console.log(`Inserted: ${dryRun ? 0 : inserted}`);
  console.log(`Skipped blank title: ${skippedBlankTitle}`);
  console.log(`Skipped invalid province: ${skippedInvalidProvince}`);
  console.log(`Skipped invalid amount: ${skippedInvalidAmount}`);
  console.log(`Skipped duplicates: ${skippedDuplicate}`);

  if (errors.length) {
    console.log('\nFirst validation errors:');
    console.log(JSON.stringify(errors.slice(0, 20), null, 2));
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(error => {
  console.error('\nImport failed');
  console.error(error);
  process.exit(1);
});
