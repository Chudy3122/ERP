import { Router } from 'express';
import multer from 'multer';
import emailController from '../controllers/email.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Attachments are streamed straight to SMTP, so keep them in memory.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
});

router.use(authenticate);

// Accounts
router.get('/accounts', emailController.listAccounts);
router.post('/accounts', emailController.addAccount);
router.delete('/accounts/:id', emailController.deleteAccount);

// Reading
router.get('/accounts/:id/folders', emailController.listFolders);
router.get('/accounts/:id/messages', emailController.listMessages);
router.get('/accounts/:id/messages/:uid', emailController.getMessage);
router.get('/accounts/:id/messages/:uid/attachments/:index', emailController.getAttachment);
router.post('/accounts/:id/messages/:uid/flags', emailController.setFlags);
router.delete('/accounts/:id/messages/:uid', emailController.deleteMessage);

// Sending
router.post('/accounts/:id/send', upload.array('attachments', 10), emailController.sendMail);

export default router;
