import multer from 'multer';

export const config = { api: { bodyParser: false } };

const upload = multer({ dest: '/tmp' });

export default function handler(req, res) {
  upload.single('statement')(req, res, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ file: req.file });
  });
}
