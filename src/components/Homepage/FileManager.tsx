import { useEffect, useState } from "react";
import {
  FileWithPath,
  FolderItem,
} from "../../lib/interfaces/FolderStructure.interface";
import { formatFileSize } from "../../lib/formating/formatFileSize";
import { getFileIcon } from "../../lib/formating/getFileIcon";
import BreadcrumbNavigation from "./BreadcrumbNavigation";
import { useNavigateToFolder } from "../../hooks/useNavigateToFolder";
import { useGetCurrentFolderItems } from "../../hooks/useGetCurrentFolderItems";

interface FileManagerProps {
  setFilesWithPathsExt: React.Dispatch<React.SetStateAction<FileWithPath[]>>;
  selectedFiles: FileList | null;
  onFilesSelected: (files: FileList | null) => void;
}

const FileManager: React.FC<FileManagerProps> = ({
  setFilesWithPathsExt,
  selectedFiles,
  onFilesSelected,
}) => {
  const { currentFolderPath, breadcrumbs, navigateToFolder } =
    useNavigateToFolder();

  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [folderStructure, setFolderStructure] = useState<FolderItem[]>([]);
  const [showMoveDialog, setShowMoveDialog] = useState<boolean>(false);
  const [itemToMove, setItemToMove] = useState<FolderItem | null>(null);
  const [selectedTargetPath, setSelectedTargetPath] = useState<string>("");
  const [lastProcessedFiles, setLastProcessedFiles] = useState<FileList | null>(
    null
  );

  const getCurrentFolderItems = useGetCurrentFolderItems(
    folderStructure,
    currentFolderPath
  );

  const createFolder = (folderName: string) => {
    if (!folderName.trim()) return;

    const newFolder: FolderItem = {
      id: Date.now().toString(),
      name: folderName.trim(),
      type: "folder",
      children: [],
      parentPath: currentFolderPath,
    };

    setFolderStructure((prev) => {
      const updated = [...prev];
      const targetPath = currentFolderPath.split("/").filter((p) => p);

      if (targetPath.length === 0) {
        // Adding to root
        updated.push(newFolder);
      } else {
        // Adding to nested folder
        const addToFolder = (
          items: FolderItem[],
          pathParts: string[]
        ): boolean => {
          for (const item of items) {
            if (item.type === "folder" && item.name === pathParts[0]) {
              if (pathParts.length === 1) {
                item.children = item.children || [];
                item.children.push(newFolder);
                return true;
              } else {
                return addToFolder(item.children || [], pathParts.slice(1));
              }
            }
          }
          return false;
        };
        addToFolder(updated, targetPath);
      }
      return updated;
    });

    setNewFolderName("");
    setShowNewFolderInput(false);
  };

  const deleteItem = (item: FolderItem) => {
    setFolderStructure((prev) => {
      const deleteFromStructure = (items: FolderItem[]): FolderItem[] => {
        return items
          .filter((i) => i.id !== item.id)
          .map((i) => ({
            ...i,
            children: i.children ? deleteFromStructure(i.children) : undefined,
          }));
      };
      return deleteFromStructure(prev);
    });

    // If it's a file, also remove from filesWithPaths and selectedFiles
    if (item.type === "file" && item.file) {
      setFilesWithPathsExt((prev) =>
        prev.filter((f) => f.path !== item.file?.path)
      );

      // Update selectedFiles by removing the deleted file
      if (selectedFiles) {
        const dataTransfer = new DataTransfer();
        Array.from(selectedFiles).forEach((file) => {
          // Only add files that are not the one being deleted
          // Match by name, size, and last modified time for better accuracy
          const fileToDelete = item.file?.file;
          if (
            !fileToDelete ||
            file.name !== fileToDelete.name ||
            file.size !== fileToDelete.size ||
            file.lastModified !== fileToDelete.lastModified
          ) {
            dataTransfer.items.add(file);
          }
        });
        onFilesSelected(dataTransfer.files);
      }
    }
  };

  const renameItem = (item: FolderItem) => {
    const newName = prompt(`Enter new ${item.type} name:`, item.name);
    if (!newName || newName.trim() === item.name) return;

    setFolderStructure((prev) => {
      const renameInStructure = (items: FolderItem[]): FolderItem[] => {
        return items.map((i) => {
          if (i.id === item.id) {
            const updatedItem = { ...i, name: newName.trim() };

            // If it's a file, also update the path in filesWithPaths
            if (item.type === "file" && item.file) {
              const oldPath = item.file.path;
              const pathParts = oldPath.split("/");
              pathParts[pathParts.length - 1] = newName.trim();
              const newPath = pathParts.join("/");

              setFilesWithPathsExt((prev) =>
                prev.map((f) =>
                  f.path === oldPath
                    ? {
                        ...f,
                        path: newPath,
                        file: new File([f.file], newName.trim(), {
                          type: f.file.type,
                        }),
                      }
                    : f
                )
              );

              updatedItem.file = {
                ...item.file,
                path: newPath,
                file: new File([item.file.file], newName.trim(), {
                  type: item.file.file.type,
                }),
              };
            }

            return updatedItem;
          }
          return {
            ...i,
            children: i.children ? renameInStructure(i.children) : undefined,
          };
        });
      };
      return renameInStructure(prev);
    });
  };

  const getAllFolderPaths = (
    items: FolderItem[] = folderStructure,
    currentPath: string = ""
  ): string[] => {
    const paths = [""]; // Root folder

    const collectPaths = (items: FolderItem[], path: string) => {
      items.forEach((item) => {
        if (item.type === "folder") {
          const itemPath = path ? `${path}/${item.name}` : item.name;
          paths.push(itemPath);
          if (item.children) {
            collectPaths(item.children, itemPath);
          }
        }
      });
    };

    collectPaths(items, currentPath);
    return paths;
  };

  const performMove = (item: FolderItem, targetPath: string) => {
    // Update file path if it's a file
    if (item.type === "file" && item.file) {
      const newPath = targetPath ? `${targetPath}/${item.name}` : item.name;
      setFilesWithPathsExt((prev) =>
        prev.map((f) =>
          f.path === item.file?.path
            ? { ...f, path: newPath, folderPath: targetPath }
            : f
        )
      );
    }

    // Move item in folder structure (remove from old location and add to new location in single update)
    setFolderStructure((prev) => {
      const removeFromStructure = (items: FolderItem[]): FolderItem[] => {
        return items
          .filter((i) => i.id !== item.id)
          .map((i) => ({
            ...i,
            children: i.children ? removeFromStructure(i.children) : undefined,
          }));
      };

      // Start with the structure with the item removed
      const updated = removeFromStructure(prev);

      // Create the updated item with new parent path
      const updatedItem: FolderItem = {
        ...item,
        parentPath: targetPath,
        // Update file path if it's a file
        ...(item.type === "file" && item.file
          ? {
              file: {
                ...item.file,
                path: targetPath ? `${targetPath}/${item.name}` : item.name,
                folderPath: targetPath,
              },
            }
          : {}),
      };

      // Add item to the target location
      const targetPathParts = targetPath.split("/").filter((p) => p);

      if (targetPathParts.length === 0) {
        // Moving to root
        updated.push(updatedItem);
      } else {
        // Moving to nested folder
        const addToFolder = (
          items: FolderItem[],
          pathParts: string[]
        ): boolean => {
          for (const folderItem of items) {
            if (
              folderItem.type === "folder" &&
              folderItem.name === pathParts[0]
            ) {
              if (pathParts.length === 1) {
                folderItem.children = folderItem.children || [];
                folderItem.children.push(updatedItem);
                return true;
              } else {
                return addToFolder(
                  folderItem.children || [],
                  pathParts.slice(1)
                );
              }
            }
          }
          return false;
        };

        if (!addToFolder(updated, targetPathParts)) {
          console.error("Failed to find target folder for move operation");
          return prev; // Return original state if move failed
        }
      }

      return updated;
    });
  };

  const moveItem = (item: FolderItem) => {
    const folderPaths = getAllFolderPaths();
    const availablePaths = folderPaths.filter(
      (path) => path !== currentFolderPath
    );

    if (availablePaths.length === 0) {
      alert("No other folders available to move to!");
      return;
    }

    if (availablePaths.length === 1) {
      // Only one option, move directly
      performMove(item, availablePaths[0]);
    } else {
      // Multiple options, show dialog
      setItemToMove(item);
      setSelectedTargetPath(availablePaths[0]);
      setShowMoveDialog(true);
    }
  };

  // Update files when new files are selected
  useEffect(() => {
    if (selectedFiles && selectedFiles !== lastProcessedFiles) {
      setLastProcessedFiles(selectedFiles);

      const newFilesWithPaths: FileWithPath[] = Array.from(selectedFiles).map(
        (file) => ({
          file: file,
          path: currentFolderPath
            ? `${currentFolderPath}/${file.name}`
            : file.name,
          folderPath: currentFolderPath,
        })
      );

      setFilesWithPathsExt((prev) => {
        // Merge with existing files, avoiding duplicates
        const existing = prev.filter(
          (fp) => !newFilesWithPaths.some((nf) => nf.path === fp.path)
        );
        return [...existing, ...newFilesWithPaths];
      });

      // Update folder structure with flies
      const fileItems: FolderItem[] = newFilesWithPaths.map((fileWithPath) => ({
        id: `file-${Date.now()}-${Math.random()}`,
        name: fileWithPath.file.name,
        type: "file",
        file: fileWithPath,
        parentPath: currentFolderPath,
      }));

      setFolderStructure((prev) => {
        const updated = [...prev];
        const targetPath = currentFolderPath.split("/").filter((p) => p);

        // Check if files already exist in the target location to not get duplicates
        const targetItems =
          targetPath.length === 0
            ? updated
            : (() => {
                let current = updated;
                for (const part of targetPath) {
                  const folder = current.find(
                    (item) => item.type === "folder" && item.name === part
                  );
                  if (folder?.children) {
                    current = folder.children;
                  } else {
                    return [];
                  }
                }
                return current;
              })();

        // Filter out fileItems that already exist in the targeted location
        const newFileItems = fileItems.filter(
          (newItem) =>
            !targetItems.some(
              (existingItem) =>
                existingItem.type === "file" &&
                existingItem.name === newItem.name &&
                existingItem.parentPath === newItem.parentPath
            )
        );

        if (newFileItems.length === 0) {
          return prev; // No new files to add
        }

        if (targetPath.length === 0) {
          // Adding to root
          return [...updated, ...newFileItems];
        } else {
          // Adding to nested folder
          const addToFolder = (
            items: FolderItem[],
            pathParts: string[]
          ): boolean => {
            for (const item of items) {
              if (item.type === "folder" && item.name === pathParts[0]) {
                if (pathParts.length === 1) {
                  item.children = [...(item.children || []), ...newFileItems];
                  return true;
                } else {
                  return addToFolder(item.children || [], pathParts.slice(1));
                }
              }
            }
            return false;
          };
          addToFolder(updated, targetPath);
          return updated;
        }
      });
    }
  }, [
    selectedFiles,
    currentFolderPath,
    lastProcessedFiles,
    setFilesWithPathsExt,
  ]);

  return (
    <>
      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation
        navigateToFolder={navigateToFolder}
        breadcrumbs={breadcrumbs}
      />
      <div className="w-full border border-gray-400 px-4 rounded-md min-h-[200px]">
        {/* New Folder Button and Input */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <h5 className="text-gray-700 font-medium">Files & Folders</h5>
          <div className="flex items-center gap-2">
            {showNewFolderInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      createFolder(newFolderName);
                    }
                  }}
                  placeholder="Folder name"
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => createFolder(newFolderName)}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName("");
                  }}
                  className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFolderInput(true)}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Folder
              </button>
            )}
          </div>
        </div>

        {/* Display Current Folder Items */}
        <div className="py-2">
          {getCurrentFolderItems.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No files or folders
            </p>
          ) : (
            getCurrentFolderItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {item.type === "folder" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-yellow-500 cursor-pointer"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      onClick={() => {
                        const newPath = currentFolderPath
                          ? `${currentFolderPath}/${item.name}`
                          : item.name;
                        navigateToFolder(newPath);
                      }}
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  ) : (
                    getFileIcon(item.file?.file.type || "")
                  )}
                  <div className="flex flex-col">
                    <span
                      className={`text-gray-700 ${
                        item.type === "folder"
                          ? "cursor-pointer hover:text-blue-600"
                          : ""
                      }`}
                      onClick={() => {
                        if (item.type === "folder") {
                          const newPath = currentFolderPath
                            ? `${currentFolderPath}/${item.name}`
                            : item.name;
                          navigateToFolder(newPath);
                        }
                      }}
                    >
                      {item.name}
                    </span>
                    {item.type === "file" && item.file && (
                      <span className="text-gray-400 text-xs">
                        {formatFileSize(item.file.file.size)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-gray-500 text-sm cursor-pointer"
                    onClick={() => moveItem(item)}
                    title="Move to folder"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span
                    className="text-gray-500 text-sm cursor-pointer"
                    onClick={() => renameItem(item)}
                    title="Rename"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path
                        fillRule="evenodd"
                        d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span
                    className="text-gray-500 text-sm cursor-pointer"
                    onClick={() => deleteItem(item)}
                    title="Delete"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h1v10a2 2 0 002 2h6a2 2 0 002-2V6h1a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 6a1 1 0 012 0v8a1 1 0 11-2 0V6zm5-1a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        {showMoveDialog && itemToMove && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-2xl font-bold mb-4">Move Item</h2>
              <p className="mb-4">
                Select the destination folder for &quot;{itemToMove.name}&quot;:
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Folder
                </label>
                <select
                  value={selectedTargetPath}
                  onChange={(e) => setSelectedTargetPath(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {getAllFolderPaths()
                    .filter((path) => path !== currentFolderPath)
                    .map((path) => (
                      <option key={path} value={path}>
                        {path || "Root"}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMoveDialog(false);
                    setItemToMove(null);
                    setSelectedTargetPath("");
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (itemToMove) {
                      performMove(itemToMove, selectedTargetPath);
                      setShowMoveDialog(false);
                      setItemToMove(null);
                      setSelectedTargetPath("");
                    }
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FileManager;
