#!/usr/bin/env node
/* Seeds the national district reference table used by Phase II metadata APIs. */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Client } = require('pg');

const districtsByProvince = {
  'Punjab': ['Attock','Bahawalnagar','Bahawalpur','Bhakkar','Chakwal','Chiniot','Dera Ghazi Khan','Faisalabad','Gujranwala','Gujrat','Hafizabad','Jhang','Jhelum','Kasur','Khanewal','Khushab','Kot Addu','Lahore','Layyah','Lodhran','Mandi Bahauddin','Mianwali','Multan','Murree','Muzaffargarh','Nankana Sahib','Narowal','Okara','Pakpattan','Rahim Yar Khan','Rajanpur','Rawalpindi','Sahiwal','Sargodha','Sheikhupura','Sialkot','Talagang','Taunsa','Toba Tek Singh','Vehari','Wazirabad'],
  'Sindh': ['Badin','Dadu','Ghotki','Hyderabad','Jacobabad','Jamshoro','Kamber Shahdadkot','Karachi Central','Karachi East','Karachi South','Karachi West','Kashmore','Keamari','Khairpur','Korangi','Larkana','Malir','Matiari','Mirpur Khas','Naushahro Feroze','Sanghar','Shaheed Benazirabad','Shikarpur','Sujawal','Sukkur','Tando Allahyar','Tando Muhammad Khan','Tharparkar','Thatta','Umerkot'],
  'Khyber Pakhtunkhwa': ['Abbottabad','Bajaur','Bannu','Battagram','Buner','Charsadda','Dera Ismail Khan','Hangu','Haripur','Karak','Khyber','Kohat','Kolai-Palas','Kurram','Lakki Marwat','Lower Chitral','Lower Dir','Lower Kohistan','Malakand','Mansehra','Mardan','Mohmand','North Waziristan','Nowshera','Orakzai','Peshawar','Shangla','South Waziristan','Swabi','Swat','Tank','Torghar','Upper Chitral','Upper Dir','Upper Kohistan'],
  'Balochistan': ['Awaran','Barkhan','Chagai','Chaman','Dera Bugti','Duki','Gwadar','Harnai','Hub','Jafarabad','Jhal Magsi','Kachhi','Kalat','Kech','Kharan','Khuzdar','Kohlu','Lasbela','Loralai','Mastung','Musakhel','Nasirabad','Nushki','Panjgur','Pishin','Qilla Abdullah','Qilla Saifullah','Quetta','Sherani','Sibi','Sohbatpur','Surab','Usta Muhammad','Washuk','Zhob','Ziarat'],
  'Gilgit-Baltistan': ['Astore','Darel','Diamer','Ghanche','Ghizer','Gilgit','Gupis-Yasin','Hunza','Kharmang','Nagar','Roundu','Shigar','Skardu','Tangir'],
  'Azad Jammu and Kashmir': ['Bagh','Bhimber','Hattian Bala','Haveli','Kotli','Mirpur','Muzaffarabad','Neelum','Poonch','Sudhnoti'],
  'Islamabad Capital Territory': ['Islamabad'],
};

const client = new Client({
  host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bcpp_db', user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD,
});

(async () => {
  try {
    await client.connect();
    let seeded = 0;
    for (const [province, districts] of Object.entries(districtsByProvince)) {
      for (const name of districts) {
        const result = await client.query(
          'INSERT INTO districts (province, name) VALUES ($1, $2) ON CONFLICT (province, name) DO NOTHING',
          [province, name]
        );
        seeded += result.rowCount;
      }
    }
    console.log(`Seeded ${seeded} new district records.`);
  } catch (error) {
    console.error('District seed failed:', error.message || error, error.code ? `(SQLSTATE ${error.code})` : '');
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
