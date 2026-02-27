import { CornerDownRight } from "lucide-react";

import formStyles from "../../styles/form.module.css";

import styles from "./settings-table.module.css";

export interface SettingsTableHeaderProps {
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
  colSpan,
}: {
  isSticky?: boolean;
  textAlign?: "left" | "center" | "right";
  className?: string;
  children: React.ReactNode;
  colSpan?: number;
}) => (
  <td
    colSpan={colSpan}
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
  style,
}: {
  name: string;
  value: string;
  placeholder?: string;
  type?: string;
  isSticky?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReadOnly?: boolean;
  isChild?: boolean;
  style?: React.CSSProperties;
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
      style={style}
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
  customBody?: React.ReactNode;
  tableAs?: React.ElementType;
  tableProps?: Record<string, unknown>;
}

const SettingsTable = ({
  headers,
  children,
  customBody,
  tableAs: TableTag = "table",
  tableProps = {},
}: SettingsTableProps) => {
  return (
    <div className={styles.settingsTableContainer}>
      <TableTag className={styles.settingsTable} {...tableProps}>
        <thead>
          <tr>
            {headers.map((headerProps, i) => (
              <SettingsTableHeader key={i} {...headerProps} />
            ))}
          </tr>
        </thead>
        {customBody ? customBody : <tbody>{children}</tbody>}
      </TableTag>
    </div>
  );
};

export default SettingsTable;
