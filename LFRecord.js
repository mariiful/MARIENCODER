import sqlite3 from "sqlite3";

const db = new sqlite3.Database('./LFRecord.db');

export function searchByNameAndState(name, stateCode) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM LFRecord 
      WHERE cityNm LIKE ? AND stCd = ?
    `;
    
    db.all(query, [`%${name}%`, stateCode], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}


export function searchByObs(obs) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM LFRecord WHERE primTecci = ?`;

    if (obs.length <= 4) {
      query = `SELECT * FROM LFRecord WHERE obsStn = ?`;
    }
    
    db.get(query, [obs], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

export function searchByCoopId(coopId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM LFRecord WHERE coopId = ?`;
    
    db.get(query, [coopId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

export function getTableSchema() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(LFRecord)", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(r => r.name));
      }
    });
  });
}