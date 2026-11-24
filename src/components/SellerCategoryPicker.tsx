import { useEffect, useState } from "react";

type Category = { id: string; name_bn: string; parent_id: string | null };

type Props = {
  categories: Category[];
  value?: string;
  name?: string;
  onChange?: (value: string) => void;
  labelClassName?: string;
};

const field = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";

export function SellerCategoryPicker({
  categories,
  value = "",
  name = "category_id",
  onChange,
  labelClassName = "block space-y-1 text-sm font-medium",
}: Props) {
  const current = categories.find((category) => category.id === value);
  const [rootId, setRootId] = useState(current?.parent_id ?? current?.id ?? "");
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    const selected = categories.find((category) => category.id === value);
    setRootId(selected?.parent_id ?? selected?.id ?? "");
    setSelectedValue(value);
  }, [categories, value]);

  const root = categories.find((category) => category.id === rootId);
  const children = categories.filter((category) => category.parent_id === rootId);

  const changeValue = (nextValue: string) => {
    setSelectedValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div className={labelClassName}>
      <span>ক্যাটাগরি</span>
      <select
        aria-label="মূল ক্যাটাগরি"
        className={field}
        value={rootId}
        onChange={(event) => {
          const nextRootId = event.target.value;
          setRootId(nextRootId);
          changeValue(nextRootId);
        }}
      >
        <option value="">মূল ক্যাটাগরি বেছে নিন</option>
        {categories.filter((category) => !category.parent_id).map((category) => (
          <option key={category.id} value={category.id}>{category.name_bn}</option>
        ))}
      </select>
      {children.length > 0 && (
        <select
          aria-label="সাব-ক্যাটাগরি"
          className={field}
          value={children.some((child) => child.id === selectedValue) ? selectedValue : rootId}
          onChange={(event) => changeValue(event.target.value)}
        >
          <option value={rootId}>সরাসরি {root?.name_bn ?? "মূল ক্যাটাগরি"}তে রাখুন</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>{child.name_bn}</option>
          ))}
        </select>
      )}
      <input type="hidden" name={name} value={selectedValue} />
    </div>
  );
}
