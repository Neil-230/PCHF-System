import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { connectDB, User } from '../database/mongodb.js';
import { emailHashFilter } from '../utils/emailLookup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const demoUsers = [
  {
    name: 'Demo Owner',
    email: 'owner@pchf.local',
    password: 'OwnerPass!123',
    role: 'owner',
  },
  {
    name: 'Demo Admin',
    email: 'admin@pchf.local',
    password: 'AdminPass!123',
    role: 'admin',
  },
  {
    name: 'Demo Cashier',
    email: 'cashier@pchf.local',
    password: 'CashierPass!123',
    role: 'cashier',
  },
];

const seedUsers = async () => {
  try {
    await connectDB();

    for (const demo of demoUsers) {
      const passwordHash = await bcrypt.hash(demo.password, 12);
      const filter = emailHashFilter(demo.email, { isArchived: false });
      let user = await User.findOne(filter);

      if (user) {
        user.name = demo.name;
        user.role = demo.role;
        user.password = passwordHash;
        user.isVerified = true;
        user.loginMethods = ['password'];
        user.passwordCreatedManually = true;
        await user.save();
        console.log(`Updated existing ${demo.role} account (${demo.email}).`);
      } else {
        user = new User({
          id: uuidv4(),
          name: demo.name,
          email: demo.email,
          password: passwordHash,
          role: demo.role,
          isVerified: true,
          loginMethods: ['password'],
          passwordCreatedManually: true,
        });
        await user.save();
        console.log(`Created ${demo.role} account (${demo.email}).`);
      }
    }

    console.log('Demo users are ready.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed demo users:', err);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

seedUsers();
