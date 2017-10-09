import path = require('path');

export async function route(filePath: string): Promise<string> {
	return path.join(__dirname, '../../', filePath);
}