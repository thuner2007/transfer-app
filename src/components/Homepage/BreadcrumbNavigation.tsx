import { BreadcrumbItem } from "../../lib/interfaces/FolderStructure.interface";

interface BreadcrumbNavigationProps {
  navigateToFolder: (path: string) => void;
  breadcrumbs: BreadcrumbItem[];
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  navigateToFolder,
  breadcrumbs,
}) => {
  return (
    <div className="w-full flex items-center gap-2 text-sm text-gray-600">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-2">
          <span
            className={`cursor-pointer hover:text-blue-600 ${
              index === breadcrumbs.length - 1
                ? "font-semibold text-blue-600"
                : ""
            }`}
            onClick={() => navigateToFolder(crumb.path)}
          >
            {crumb.name}
          </span>
          {index < breadcrumbs.length - 1 && (
            <span className="text-gray-400">/</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default BreadcrumbNavigation;
