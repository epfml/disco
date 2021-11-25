import path from 'path';

/**
 * File containing all server-wide constants, e.g. absolute paths
 * to resources, or URIs.
 */

/**
 * File system saving scheme (URL-like).
 */
export const SAVING_SCHEME = 'file://';
/**
 * Root directory of the server app.
 */
export const ROOT_DIR = path.dirname(new URL(import.meta.url).pathname);
/**
 * Source directory.
 */
export const SOURCE_DIR = path.join(ROOT_DIR, 'src');
/**
 * Directory containing all task definition files.
 */
export const TASKS_DIR = path.join(SOURCE_DIR, 'tasks');
/**
 * JSON file containing all tasks metadata.
 */
export const TASKS_FILE = path.join(TASKS_DIR, 'tasks.json');
/**
 * Directory containing all the generated task model files.
 */
export const MODELS_DIR = path.join(ROOT_DIR, 'models');
/**
 * Directory containing all the generated milestones files.
 */
export const MILESTONES_DIR = path.join(ROOT_DIR, 'milestones');

export const CONNECTION_PROTOCOL = 'http';

export const HOST_NAME = 'localhost';

export const SERVER_URI = `${CONNECTION_PROTOCOL}://${HOST_NAME}`;

export const SERVER_PORT = 8080;

export const START_TASK_PORT = 9000;
