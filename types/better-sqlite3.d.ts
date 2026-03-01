declare module 'better-sqlite3' {
  class Database {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): any;
  }
  export = Database;
}
