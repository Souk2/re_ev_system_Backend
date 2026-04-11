import { Router, Request, Response } from 'express';
import { baseService } from '../../services/BaseService';
import { tableConfigs } from '../../config/tables';

// ສ້າງ Router ສຳລັບ CRUD ແບບ Dynamic
export const createDynamicRoutes = () => {
  const router = Router();

  // ວົນຮອບຕາຕະລາງທີ່ກຳນົດໄວ້ໃນ config
  Object.keys(tableConfigs).forEach((tableName) => {
    // Support both underscore and hyphen formats (academic_years AND academic-years)
    const resourcePathUnderscore = `/${tableName}`;
    const resourcePathHyphen = `/${tableName.replace(/_/g, '-')}`;
    
    // Use both paths to support either format
    [resourcePathUnderscore, resourcePathHyphen].forEach((resourcePath) => {
      // GET All (ມີ Pagination)
      router.get(resourcePath, (req: Request, res: Response) => {
        baseService.getAll(tableName, req, res);
      });

      // GET By ID
      router.get(`${resourcePath}/:id`, (req: Request, res: Response) => {
        baseService.getById(tableName, req, res);
      });

      // POST Create
      router.post(resourcePath, (req: Request, res: Response) => {
        baseService.create(tableName, req, res);
      });

      // PUT Update
      router.put(`${resourcePath}/:id`, (req: Request, res: Response) => {
        baseService.update(tableName, req, res);
      });

      // DELETE
      router.delete(`${resourcePath}/:id`, (req: Request, res: Response) => {
        baseService.delete(tableName, req, res);
      });
    });
  });

  return router;
};
