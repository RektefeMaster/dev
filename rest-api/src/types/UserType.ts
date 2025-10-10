export enum UserType {
  USER = 'user',
  DRIVER = 'driver',
  MECHANIC = 'mechanic',
  ADMIN = 'admin'
}

export type UserTypeString = 'user' | 'driver' | 'mechanic' | 'admin';

export const USER_TYPE_VALUES = ['user', 'driver', 'mechanic', 'admin'] as const;

export const isUserType = (value: string): value is UserTypeString => {
  return USER_TYPE_VALUES.includes(value as UserTypeString);
};
