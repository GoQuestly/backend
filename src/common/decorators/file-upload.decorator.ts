import {applyDecorators, UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {ApiConsumes, ApiBody} from '@nestjs/swagger';
import {createMulterOptions, FileUploadConfig} from "@/common/config/file-upload.config";


export function FileUpload(config: FileUploadConfig, description?: string) {
    return applyDecorators(
        UseInterceptors(FileInterceptor('file', createMulterOptions(config))),
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    file: {
                        type: 'string',
                        format: 'binary',
                        description: description || 'File to upload',
                    },
                },
                required: ['file'],
            },
        })
    );
}