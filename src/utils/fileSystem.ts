import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Usar la API legacy hasta que actualicemos a la nueva API con File y Directory
const fs = FileSystem;

// Obtener el directorio temporal apropiado
export const getTempDir = (): string => {
  // En desarrollo, siempre usar documentDirectory que debería ser accesible
  if (__DEV__ && fs.documentDirectory) {
    return fs.documentDirectory;
  }
  
  // En producción, usar cacheDirectory en Android
  if (Platform.OS === 'android' && fs.cacheDirectory) {
    return fs.cacheDirectory;
  }
  
  // Por defecto, usar documentDirectory
  return fs.documentDirectory || '';
};

// Asegurar que un directorio exista
export const ensureDirExists = async (dir: string): Promise<void> => {
  try {
    const dirInfo = await fs.getInfoAsync(dir);
    
    if (!dirInfo.exists) {
      await fs.makeDirectoryAsync(dir, { intermediates: true });
    } else if (!dirInfo.isDirectory) {
      throw new Error('La ruta especificada no es un directorio');
    }
  } catch (error) {
    console.error('Error al asegurar que el directorio existe:', error);
    throw new Error('No se pudo crear el directorio para guardar el archivo');
  }
};

// Guardar un archivo con contenido en base64
export const saveFile = async (filePath: string, content: string): Promise<string> => {
  try {
    // Asegurarse de que el directorio padre exista
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    await ensureDirExists(dirPath);
    
    // Escribir el archivo
    await fs.writeAsStringAsync(filePath, content, { 
      encoding: 'base64' as any
    });
    
    // Verificar que el archivo se creó correctamente
    const fileInfo = await fs.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('El archivo no se pudo crear');
    }
    
    return filePath;
  } catch (error) {
    console.error('Error al guardar el archivo:', error);
    throw new Error('No se pudo guardar el archivo. Verifique los permisos de almacenamiento.');
  }
};

export default {
  getTempDir,
  ensureDirExists,
  saveFile,
};
