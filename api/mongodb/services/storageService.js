const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');

// Configuration du stockage local
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Créer les dossiers de stockage
const createStorageDirectories = async () => {
  const directories = [
    STORAGE_ROOT,
    path.join(STORAGE_ROOT, 'client-files'),
    path.join(STORAGE_ROOT, 'client-files/photos'),
    path.join(STORAGE_ROOT, 'client-files/passports'), 
    path.join(STORAGE_ROOT, 'client-files/documents'),
    path.join(STORAGE_ROOT, 'transaction-archives'),
    path.join(STORAGE_ROOT, 'temp'),
    path.join(STORAGE_ROOT, '.metadata')
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};

// Configuration Multer pour le téléchargement des fichiers
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const bucket = req.params.bucket || 'client-files';
    const clientId = req.body.clientId || req.params.clientId;
    
    let destinationPath = path.join(STORAGE_ROOT, bucket);
    
    if (clientId) {
      destinationPath = path.join(destinationPath, clientId);
      await fs.mkdir(destinationPath, { recursive: true });
    }
    
    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${sanitizedName}_${uniqueSuffix}${ext}`);
  }
});

// Configuration Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Service de stockage local
class LocalStorageService {
  constructor() {
    this.initializeStorage();
  }

  async initializeStorage() {
    await createStorageDirectories();
  }

  // Vérifier si un fichier existe
  async fileExists(bucket, filePath) {
    try {
      const fullPath = path.join(STORAGE_ROOT, bucket, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  // Téléverser un fichier
  async uploadFile(bucket, filePath, fileBuffer, metadata = {}) {
    try {
      const fullPath = path.join(STORAGE_ROOT, bucket, filePath);
      const directory = path.dirname(fullPath);
      
      // Créer le dossier parent si nécessaire
      await fs.mkdir(directory, { recursive: true });
      
      // Écrire le fichier
      await fs.writeFile(fullPath, fileBuffer);
      
      // Créer les métadonnées
      const fileStats = await fs.stat(fullPath);
      const fileMetadata = {
        path: filePath,
        bucket: bucket,
        size: fileStats.size,
        createdAt: fileStats.birthtime,
        modifiedAt: fileStats.mtime,
        contentType: metadata.contentType || 'application/octet-stream',
        originalName: metadata.originalName || path.basename(filePath),
        ...metadata
      };
      
      // Sauvegarder les métadonnées
      const metadataPath = `${fullPath}.metadata.json`;
      await fs.writeFile(metadataPath, JSON.stringify(fileMetadata, null, 2));
      
      return {
        success: true,
        path: filePath,
        url: `/api/storage/${bucket}/${filePath}`,
        metadata: fileMetadata
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Télécharger un fichier
  async downloadFile(bucket, filePath) {
    try {
      const fullPath = path.join(STORAGE_ROOT, bucket, filePath);
      
      // Vérifier si le fichier existe
      if (!fsSync.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Lire le fichier
      const fileBuffer = await fs.readFile(fullPath);
      
      // Lire les métadonnées si disponibles
      let metadata = {};
      const metadataPath = `${fullPath}.metadata.json`;
      if (fsSync.existsSync(metadataPath)) {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      }
      
      return {
        buffer: fileBuffer,
        metadata: metadata
      };
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  // Obtenir une URL signée (simulée pour compatibilité)
  async createSignedUrl(bucket, filePath, expiresIn = 3600) {
    try {
      const fullPath = path.join(STORAGE_ROOT, bucket, filePath);
      
      if (!fsSync.existsSync(fullPath)) {
        return null;
      }
      
      // Pour le développement local, on retourne une URL directe
      // En production, vous pourriez implémenter des tokens JWT
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      return {
        signedUrl: `/api/storage/${bucket}/${filePath}?expires=${expiresAt.getTime()}`,
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      console.error('Signed URL error:', error);
      throw error;
    }
  }

  // Lister les fichiers d'un bucket
  async listFiles(bucket, prefix = '', recursive = true) {
    try {
      const bucketPath = path.join(STORAGE_ROOT, bucket);
      const files = [];
      
      async function walkDirectory(dir, currentPrefix = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(currentPrefix, entry.name);
          
          if (entry.isDirectory() && recursive) {
            await walkDirectory(fullPath, relativePath);
          } else if (entry.isFile() && !entry.name.endsWith('.metadata.json')) {
            // Lire les métadonnées
            let metadata = {};
            const metadataPath = `${fullPath}.metadata.json`;
            if (fsSync.existsSync(metadataPath)) {
              const metadataContent = await fs.readFile(metadataPath, 'utf8');
              metadata = JSON.parse(metadataContent);
            }
            
            const stats = await fs.stat(fullPath);
            
            files.push({
              name: entry.name,
              path: relativePath,
              size: stats.size,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              metadata: metadata
            });
          }
        }
      }
      
      if (fsSync.existsSync(bucketPath)) {
        await walkDirectory(bucketPath);
      }
      
      return files;
    } catch (error) {
      console.error('List files error:', error);
      throw error;
    }
  }

  // Supprimer un fichier
  async deleteFile(bucket, filePath) {
    try {
      const fullPath = path.join(STORAGE_ROOT, bucket, filePath);
      const metadataPath = `${fullPath}.metadata.json`;
      
      // Supprimer le fichier
      if (fsSync.existsSync(fullPath)) {
        await fs.unlink(fullPath);
      }
      
      // Supprimer les métadonnées
      if (fsSync.existsSync(metadataPath)) {
        await fs.unlink(metadataPath);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  // Obtenir les statistiques du stockage
  async getStorageStats() {
    try {
      const stats = {
        totalSize: 0,
        fileCount: 0,
        buckets: {}
      };
      
      const buckets = ['client-files', 'transaction-archives'];
      
      for (const bucket of buckets) {
        const bucketPath = path.join(STORAGE_ROOT, bucket);
        let bucketSize = 0;
        let bucketCount = 0;
        
        if (fsSync.existsSync(bucketPath)) {
          const files = await this.listFiles(bucket);
          bucketCount = files.length;
          bucketSize = files.reduce((total, file) => total + file.size, 0);
        }
        
        stats.buckets[bucket] = {
          fileCount: bucketCount,
          totalSize: bucketSize
        };
        
        stats.totalSize += bucketSize;
        stats.fileCount += bucketCount;
      }
      
      return stats;
    } catch (error) {
      console.error('Storage stats error:', error);
      throw error;
    }
  }
}

// Middleware pour servir les fichiers statiques avec sécurité
const serveFile = async (req, res, next) => {
  try {
    const { bucket, path: filePath } = req.params;
    
    // Valider le bucket
    const allowedBuckets = ['client-files', 'transaction-archives'];
    if (!allowedBuckets.includes(bucket)) {
      return res.status(403).json({ error: 'Invalid bucket' });
    }
    
    // Vérifier l'expiration de l'URL (simulation)
    const expires = req.query.expires;
    if (expires && new Date(parseInt(expires)) < new Date()) {
      return res.status(401).json({ error: 'URL expired' });
    }
    
    // Pour le développement, permettre l'accès sans expiration
    // En production, implémenter une vérification d'authentification
    
    const fullPath = path.join(STORAGE_ROOT, bucket, filePath);
    
    if (!fsSync.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Déterminer le type MIME
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Envoyer le fichier
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    const fileStream = fsSync.createReadStream(fullPath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  LocalStorageService,
  upload,
  serveFile,
  STORAGE_ROOT
};