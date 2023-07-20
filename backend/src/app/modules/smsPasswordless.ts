import cache from "./cache";

export default class SmsPasswordless {
  static async initiate({ number }): Promise<{ success?: boolean; code?: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `mfa:${number}`;
    cache.setItem(key, code);
    return { success: true, code };
  }

  static async verify({ number, code }: { number: string; code: string }): Promise<boolean> {
    const key = `mfa:${number}`;
    const savedCode = cache.getItem(key);
    if (savedCode && savedCode === code) {
      return true;
    }
    throw new Error("Invalid code");
  }
}
