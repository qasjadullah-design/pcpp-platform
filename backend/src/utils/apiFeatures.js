const { Op } = require('sequelize');

class APIFeatures {
  static buildWhereClause(query) {
    const where = {};
    if (query.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query.search}%` } },
        { abstract: { [Op.iLike]: `%${query.search}%` } },
        { organization_name: { [Op.iLike]: `%${query.search}%` } },
        { province: { [Op.iLike]: `%${query.search}%` } },
        { district: { [Op.iLike]: `%${query.search}%` } },
      ];
    }
    if (query.sector) where.primary_sector = query.sector;
    if (query.province) where.province = query.province;
    if (query.district) where.district = query.district;
    if (query.status) where.status = query.status;
    if (query.trl) where.trl_level = query.trl;
    return where;
  }

  static getPagination(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;
    return { limit, offset, page };
  }

  static getOrder(query) {
    const sort = query.sort || '-created_at';
    const order = sort.startsWith('-') ? 'DESC' : 'ASC';
    const field = sort.replace('-', '');
    return [[field, order]];
  }
}

module.exports = APIFeatures;
