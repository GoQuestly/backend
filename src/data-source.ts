import { DataSource } from 'typeorm';
import { typeOrmConfig } from "./common/typeorm.config";

export const AppDataSource = new DataSource(typeOrmConfig);