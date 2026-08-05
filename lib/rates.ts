import { prisma as defaultPrisma } from './prisma';

export interface SystemRates {
  permanent: { breakfast: number; lunch: number; dinner: number; monthlyCharge: number };
  guest: { breakfast: number; lunch: number; dinner: number; monthlyCharge: number };
  globalMealStatus: { breakfast: boolean; lunch: boolean; dinner: boolean };
  cutoffTime: string;
}

export const defaultConfig: SystemRates = {
  permanent: { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 },
  guest: { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 },
  globalMealStatus: { breakfast: true, lunch: true, dinner: true },
  cutoffTime: '10:00',
};

export async function getSystemRatesFromDb(tx?: any): Promise<SystemRates> {
  const db = tx || defaultPrisma;
  try {
    const configs = await db.systemConfig.findMany();
    if (configs && configs.length > 0) {
      const config: SystemRates = {
        permanent: { ...defaultConfig.permanent },
        guest: { ...defaultConfig.guest },
        globalMealStatus: { ...defaultConfig.globalMealStatus },
        cutoffTime: defaultConfig.cutoffTime,
      };

      configs.forEach((item: any) => {
        if (item.key === 'rates_permanent' && item.valueJson) {
          config.permanent = { ...config.permanent, ...(item.valueJson as any) };
        }
        if (item.key === 'rates_guest' && item.valueJson) {
          config.guest = { ...config.guest, ...(item.valueJson as any) };
        }
        if (item.key === 'global_status' && item.valueJson) {
          config.globalMealStatus = { ...config.globalMealStatus, ...(item.valueJson as any) };
        }
        if (item.key === 'cutoff_time' && item.valueJson) {
          config.cutoffTime = (item.valueJson as any)?.cutoffTime || '10:00';
        }
      });
      return config;
    }
  } catch (err) {
    console.error('Error in getSystemRatesFromDb:', err);
  }
  return defaultConfig;
}
