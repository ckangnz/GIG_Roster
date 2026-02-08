import { CornerDownRight } from "lucide-react";
import "./settings-table.css";

interface SettingsTableHeaderProps {
  text: string;
  textAlign?: "left" | "center" | "right";
  width?: number;
  minWidth?: number;
  isSticky?: boolean;
}

export const SettingsTableHeader = ({
  text,
  textAlign = "left",
  width,
  minWidth,
  isSticky = false,
}: SettingsTableHeaderProps) => {
  return (
    <th
      className={isSticky ? "sticky-col" : undefined}
      style={{
        textAlign: textAlign,
        width: width ? `${width}px` : "auto",
        minWidth: minWidth ? `${minWidth}px` : "auto",
      }}
    >
      {text}
    </th>
  );
};

export const SettingsTableAnyCell = ({
  isSticky = false,
  textAlign = "left",
  className,
  children,
}: {
  isSticky?: boolean;
  textAlign?: "left" | "center" | "right";
  className?: string;
  children: React.ReactNode;
}) => (
  <td
    style={{
      textAlign: textAlign,
    }}
    className={`${className ? className : ""} ${isSticky ? "sticky-col" : ""}
`}
  >
    {children}
  </td>
);

export const SettingsTableInputCell = ({
  name,
  value,
  placeholder,
  type = "text",
  isSticky,
  isReadOnly = false,
  isChild = false,
  onChange,
}: {
  name: string;
  value: string;
  placeholder?: string;
  type?: string;
  isSticky?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReadOnly?: boolean;
  isChild?: boolean;
}) => (
  <SettingsTableAnyCell isSticky={isSticky}>
    {isChild && <CornerDownRight />}
    <input
      name={name}
      className="form-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      readOnly={isReadOnly}
    />
  </SettingsTableAnyCell>
);

export const SettingsTableColourInputCell = ({
  name,
  value,
  placeholder,
  onChange,
}: {
  name: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <SettingsTableAnyCell className="color-picker-group">
    <input
      name={name}
      type="color"
      value={value ? value : "#FFFFFF"}
      onChange={onChange}
    />
    <input
      name={name}
      className="form-input"
      value={value}
      placeholder={placeholder}
      onChange={onChange}
    />
  </SettingsTableAnyCell>
);

interface SettingsTableProps {
  headers: SettingsTableHeaderProps[];
  children: React.ReactNode;
}

const SettingsTable = ({ headers, children }: SettingsTableProps) => {
  return (
    <div className="app-table-container">
      <table className="app-table">
        <thead>
          <tr>
            {headers.map((headerProps, i) => (
              <SettingsTableHeader key={i} {...headerProps} />
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

export default SettingsTable;
