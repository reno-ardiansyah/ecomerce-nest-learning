export class User {
  name!: string;
  email!: string;
  password_hash!: string;
  phone?: string;
  role!: 'admin' | 'customer' | 'seller';
  created_at!: Date;
  updated_at!: Date;
}
