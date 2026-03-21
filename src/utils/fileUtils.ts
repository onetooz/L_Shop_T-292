import fs from 'fs/promises';
import path from 'path';

export class FileDB<T extends { id: string }> {
  private filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(__dirname, '..', 'data', filename);
  }

  async read(): Promise<T[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as T[];
    } catch (error) {
      return [];
    }
  }

  async write(data: T[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async findById(id: string): Promise<T | null> {
    const items = await this.read();
    const found = items.find(item => item.id === id);
    return found || null;
  }

  async create(item: T): Promise<T> {
    const items = await this.read();
    items.push(item);
    await this.write(items);
    return item;
  }

  async update(id: string, updatedItem: Partial<T>): Promise<T | null> {
    const items = await this.read();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    items[index] = { ...items[index], ...updatedItem };
    await this.write(items);
    return items[index];
  }

  async delete(id: string): Promise<boolean> {
    const items = await this.read();
    const filtered = items.filter(item => item.id !== id);
    if (filtered.length === items.length) return false;
    
    await this.write(filtered);
    return true;
  }
}