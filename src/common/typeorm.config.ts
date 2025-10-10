import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';
import {DataSourceOptions} from "typeorm";
config();

export const typeOrmConfig: TypeOrmModuleOptions & DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: ['src/common/entities/*.ts'],
    migrations: ['dist/migrations/*.js'],
    synchronize: false,
};
