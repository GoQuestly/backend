import {diskStorage} from 'multer';
import {extname} from 'path';
import {BadRequestException} from '@nestjs/common';
import {MulterOptions} from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export interface FileUploadConfig {
    destination: string;
    maxFileSize: number;
    allowedMimeTypesRegex: RegExp;
    errorMessage?: string;
}

export function createMulterOptions(config: FileUploadConfig): MulterOptions {
    return {
        storage: diskStorage({
            destination: config.destination,
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                callback(null, uniqueSuffix + extname(file.originalname));
            },
        }),
        limits: {fileSize: config.maxFileSize},
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(config.allowedMimeTypesRegex)) {
                return callback(
                    new BadRequestException(
                        config.errorMessage || 'Only image files are allowed!'
                    ),
                    false
                );
            }
            callback(null, true);
        },
    };
}