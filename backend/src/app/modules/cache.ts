class MemoryStore {
  store: Record<string, string> = {};

  getItem(key: string): string {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

export default new MemoryStore();
