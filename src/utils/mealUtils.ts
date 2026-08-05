import { User, MealDeclaration, MealRateConfig, EmergencyClosure } from '../types';

export function getUserMealStateForDate(
  user: User,
  dateStr: string,
  declaration?: MealDeclaration,
  rates?: MealRateConfig,
  emergency?: EmergencyClosure
) {
  if (user.isIndefinitelyPaused || user.status !== 'APPROVED') {
    return { breakfast: false, lunch: false, dinner: false };
  }

  const permRates = rates?.permanent || { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 };
  const guestRates = rates?.guest || { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 };
  const userRates = user.userType === 'GUEST' ? guestRates : permRates;

  const isBGlobalOff = rates?.globalMealStatus?.breakfast === false;
  const isLGlobalOff = rates?.globalMealStatus?.lunch === false;
  const isDGlobalOff = rates?.globalMealStatus?.dinner === false;

  const isBEmergencyOff = !!emergency && emergency.closedMeals.includes('breakfast');
  const isLEmergencyOff = !!emergency && emergency.closedMeals.includes('lunch');
  const isDEmergencyOff = !!emergency && emergency.closedMeals.includes('dinner');

  const minMealCost = Math.min(userRates.breakfast, userRates.lunch, userRates.dinner);
  const defaultActive = (user.walletBalance ?? 0) >= minMealCost;

  const rawB = declaration ? declaration.breakfast : defaultActive;
  const rawL = declaration ? declaration.lunch : defaultActive;
  const rawD = declaration ? declaration.dinner : defaultActive;

  return {
    breakfast: isBGlobalOff || isBEmergencyOff ? false : rawB,
    lunch: isLGlobalOff || isLEmergencyOff ? false : rawL,
    dinner: isDGlobalOff || isDEmergencyOff ? false : rawD,
  };
}
