import '../../backend/polyfill';
import app from '../../backend/server';
import db from '../../backend/database';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing so Multer can handle it
    externalResolver: true, // Tells Next.js that Express will handle the response
  },
};

let dbInitialized = false;

export default async function handler(req, res) {
  if (!dbInitialized) {
    try {
      await db.initDB();
      dbInitialized = true;
    } catch (err) {
      console.error('Database init error:', err);
    }
  }
  return app(req, res);
}
