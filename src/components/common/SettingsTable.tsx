import { CornerDownRight } from "lucide-react";

import formStyles from "../../styles/form.module.css";

import styles from "./settings-table.module.css";

interface SettingsTableHeaderProps {
  text: string;
  textAlign?: "left" | "center" | "right";
  width?: number;
  minWidth?: number;
}

export const SettingsTableHeader = ({
  text,
  textAlign = "left",
  width,
  minWidth,
}: SettingsTableHeaderProps) => {
  return (
    <th
      className={styles.stickyCol}
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
      display: textAlign === "center" ? "table-cell" : undefined,
    }}
    className={`${className ? className : ""} ${isSticky ? styles.stickyCol : ""}
`}
  >
    <div
      style={{
        display: "flex",
        justifyContent:
          textAlign === "center"
            ? "center"
            : textAlign === "right"
              ? "flex-end"
              : "flex-start",
        alignItems: "center",
        gap: "8px",
        height: "100%",
      }}
    >
      {children}
    </div>
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
      className={formStyles.formInput}
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
  <SettingsTableAnyCell className={styles.colorPickerGroup}>
    <input
      name={name}
      type="color"
      className={formStyles.colorInput}
      value={value ? value : "#FFFFFF"}
      onChange={onChange}
    />
    <input
      name={name}
      className={formStyles.formInput}
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
    <div className={styles.appTableContainer}>
      <table className={styles.appTable}>
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
