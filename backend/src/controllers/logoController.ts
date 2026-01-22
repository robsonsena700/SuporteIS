import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import { pool } from '../config/database';

const UPLOAD_DIR = path.join(__dirname, '../../public/assets/logos');

export const uploadLogo = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { buffer, originalname } = req.file;
    const timestamp = Date.now();
    const sourceFilename = `logo_primary_${timestamp}${path.extname(originalname)}`;
    
    // Save Source
    await fs.ensureDir(path.join(UPLOAD_DIR, 'source'));
    await fs.writeFile(path.join(UPLOAD_DIR, 'source', sourceFilename), buffer);

    // Process Web Version (500x500 max, resize fit)
    await fs.ensureDir(path.join(UPLOAD_DIR, 'web'));
    await sharp(buffer)
      .resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(UPLOAD_DIR, 'web', 'logo_web.png'));

    // Process Mobile Versions
    await fs.ensureDir(path.join(UPLOAD_DIR, 'mobile'));
    
    // @1x (Base)
    await sharp(buffer)
      .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(UPLOAD_DIR, 'mobile', 'logo_mobile.png'));

    // @2x
    await sharp(buffer)
      .resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(UPLOAD_DIR, 'mobile', 'logo_mobile@2x.png'));

    // @3x
    await sharp(buffer)
      .resize(450, 450, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(UPLOAD_DIR, 'mobile', 'logo_mobile@3x.png'));

    // Audit Log
    const userId = (req as any).user?.id;
    if (userId) {
      await pool.query(
        'INSERT INTO audit_logs (action, entity_id, user_id, details) VALUES ($1, $2, $3, $4)',
        ['UPDATE_LOGO', userId, userId, `Updated logo. Source: ${sourceFilename}`]
      );
    }

    res.status(200).json({ 
      message: 'Logo updated successfully', 
      files: {
        source: `/assets/logos/source/${sourceFilename}`,
        web: '/assets/logos/web/logo_web.png',
        mobile: '/assets/logos/mobile/logo_mobile.png'
      }
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ message: 'Failed to process logo upload' });
  }
};

export const getLogos = async (req: Request, res: Response) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            web: `${baseUrl}/assets/logos/web/logo_web.png`,
            mobile: {
                x1: `${baseUrl}/assets/logos/mobile/logo_mobile.png`,
                x2: `${baseUrl}/assets/logos/mobile/logo_mobile@2x.png`,
                x3: `${baseUrl}/assets/logos/mobile/logo_mobile@3x.png`,
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving logos' });
    }
};
