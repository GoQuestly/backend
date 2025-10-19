import {FileUploadConfig} from '../config/file-upload.config';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export const AVATAR_UPLOAD_CONFIG: FileUploadConfig = {
    destination: './uploads/avatars',
    maxFileSize: MAX_AVATAR_SIZE_BYTES,
    allowedMimeTypesRegex: /\/(jpg|jpeg|png|webp)$/,
    errorMessage: 'Only image files are allowed (JPG, PNG, WEBP)',
};

export const QUEST_COVER_UPLOAD_CONFIG: FileUploadConfig = {
    destination: './uploads/quests',
    maxFileSize: MAX_FILE_SIZE_BYTES,
    allowedMimeTypesRegex: /\/(jpg|jpeg|png|gif)$/,
    errorMessage: 'Only image files are allowed (JPG, PNG, GIF)',
};