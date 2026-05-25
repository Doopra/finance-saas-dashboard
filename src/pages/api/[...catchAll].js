import '../../backend/polyfill';
import app from '../../backend/server';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing so Multer can handle it
    externalResolver: true, // Tells Next.js that Express will handle the response
  },
};

export default function handler(req, res) {
  return app(req, res);
}
