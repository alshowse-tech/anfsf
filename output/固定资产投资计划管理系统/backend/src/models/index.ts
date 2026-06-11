// [generated]
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './db/dev.sqlite',
  logging: false
});

// TODO: define models (InvestmentPlan, Contract, Budget, Approval, User)

export default sequelize;