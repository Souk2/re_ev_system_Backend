import { Router } from 'express';
import { createDynamicRoutes } from './dynamicRoutes';

const router = Router();

// ນຳໃຊ້ Dynamic CRUD Router ສຳລັບທຸກຕາຕະລາງໃນ Config
router.use(createDynamicRoutes());

// ເສັ້ນທາງ API Root
router.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    documentation: 'Use /:resource (e.g., /departments, /courses) to access CRUD endpoints',
    availableResources: Object.keys(require('../../config/tables').tableConfigs)
  });
});

export default router;
