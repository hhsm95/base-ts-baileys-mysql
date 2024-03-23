import mysql, { Pool, PoolConnection, FieldInfo, MysqlError } from "mysql";
import {
  MYSQL_DB_HOST,
  MYSQL_DB_NAME,
  MYSQL_DB_PASSWORD,
  MYSQL_DB_USER,
} from "src/config";

// Configuración de la conexión a la base de datos
const pool: Pool = mysql.createPool({
  connectionLimit: 10,
  host: MYSQL_DB_HOST,
  user: MYSQL_DB_USER,
  password: MYSQL_DB_PASSWORD,
  database: MYSQL_DB_NAME,
});

// Función para ejecutar una consulta con parámetros
export const ejecutarConsulta = async <T>(
  sql: string,
  params: any[]
): Promise<T[]> => {
  const connection: PoolConnection = await new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });

  try {
    const results = await new Promise<T[]>((resolve, reject) => {
      connection.query(
        sql,
        params,
        (
          error: MysqlError | null,
          results?: T[],
          fields?: FieldInfo[]
        ): void => {
          connection.release();
          if (error) reject(error);
          else resolve(results);
        }
      );
    });
    return results;
  } catch (error) {
    console.error("Error al ejecutar la consulta:", error);
    throw error;
  }
};
