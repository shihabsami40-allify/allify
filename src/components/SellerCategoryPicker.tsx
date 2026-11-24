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
  const selected = categories.find((category) => category.id === value);
  const selectedParent = categories.find((category) => category.id === selected?.parent_id);
  const initialRoot = selectedParent?.parent_id
    ? categories.find((category) => category.id === selectedParent.parent_id)?.id ?? ""
    : selectedParent?.id ?? selected?.id ?? "";

  const [rootId, setRootId] = useState(initialRoot);
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    const current = categories.find((category) => category.id === value);
    const parent = categories.find((category) => category.id === current?.parent_id);
    const root = parent?.parent_id
      ? categories.find((category) => category.id === parent.parent_id)
      : parent ?? current;
    setRootId(root?.id ?? "");
    setSelectedValue(value);
  }, [categories, value]);

  const root = categories.find((category) => category.id === rootId);
  const rootChildren = categories.filter((category) => category.parent_id === rootId);
  const currentSelection = categories.find((category) => category.id === selectedValue);
  const currentParent = categories.find((category) => category.id === currentSelection?.parent_id);
  const secondId = currentSelection?.parent_id === rootId
    ? currentSelection.id
    : currentParent?.id ?? rootId;
  const second = categories.find((category) => category.id === secondId);
  const secondChildren = categories.filter((category) => category.parent_id === secondId);

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
      {rootChildren.length > 0 && (
        <select
          aria-label="সাব-ক্যাটাগরি"
          className={field}
          value={rootChildren.some((child) => child.id === secondId) ? secondId : rootId}
          onChange={(event) => changeValue(event.target.value)}
        >
          <option value={rootId}>সরাসরি {root?.name_bn ?? "মূল ক্যাটাগরি"}তে রাখুন</option>
          {rootChildren.map((child) => (
            <option key={child.id} value={child.id}>{child.name_bn}</option>
          ))}
        </select>
      )}
      {secondChildren.length > 0 && (
        <select
          aria-label="নির্দিষ্ট ক্যাটাগরি"
          className={field}
          value={secondChildren.some((child) => child.id === selectedValue) ? selectedValue : secondId}
          onChange={(event) => changeValue(event.target.value)}
        >
          <option value={secondId}>সরাসরি {second?.name_bn ?? "সাব-ক্যাটাগরি"}তে রাখুন</option>
          {secondChildren.map((child) => (
            <option key={child.id} value={child.id}>{child.name_bn}</option>
          ))}
        </select>
      )}
      <input type="hidden" name={name} value={selectedValue} />
    </div>
  );
}
