interface ProjectFile {
  id: string;
  fileName: string;
  filePath: string;
  parentFolderId?: string;
  isFolder: boolean;
}

export const generateBreadcrumbs = (file: ProjectFile, allFiles: ProjectFile[]): string[] => {
  if (!file) return [];
  
  const breadcrumbs: string[] = [];
  const fileMap = new Map(allFiles.map(f => [f.id, f]));
  
  // Start with the current file
  breadcrumbs.unshift(file.fileName);
  
  // Traverse up the parent chain
  let currentParentId = file.parentFolderId;
  while (currentParentId) {
    const parent = fileMap.get(currentParentId);
    if (!parent) break;
    
    breadcrumbs.unshift(parent.fileName);
    currentParentId = parent.parentFolderId;
  }
  
  return breadcrumbs;
};

export const getBreadcrumbPath = (file: ProjectFile, allFiles: ProjectFile[]): string => {
  const breadcrumbs = generateBreadcrumbs(file, allFiles);
  return breadcrumbs.join(' / ');
};