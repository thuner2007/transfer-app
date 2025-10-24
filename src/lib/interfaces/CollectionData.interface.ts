export interface CollectionData {
  id: string;
  creator: string;
  fileCount: number;
  filesSize: number;
  files: {
    id: string;
    filename: string;
    mimetype: string;
    size: number;
  }[];
  hasPassword: boolean;
  createdAt: string;
}
