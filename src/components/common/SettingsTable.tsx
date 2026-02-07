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
  children,
}: {
  children: React.ReactNode;
}) => <td>{children}</td>;

export const SettingsTableInputCell = ({
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <td>
    <input
      className="form-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </td>
);

export const SettingsTableColourInputCell = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <td className="color-picker-group">
    <input type="color" value={value} onChange={onChange} />
    <input className="form-input" value={value} onChange={onChange} />
  </td>
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
