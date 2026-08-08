import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormPanel,
  defaultWinForm,
} from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFormMessage } from "@/hooks/useFormMessage";
import { inventoryMasterService } from "@/services/inventoryMasterService";
import type { InventoryMasterItem } from "@/types/inventoryMaster";
import { MAX_INVENTORY_IMAGES } from "@/types/inventoryMaster";

const inventoryExtraSchema = z.object({
  weight: z.string(),
  neck_size: z.string(),
  qty_per_box: z.string(),
  box_dimension: z.string().max(255, "Box dimension is too long"),
  reorder_level: z.string(),
});

type InventoryExtraValues = z.infer<typeof inventoryExtraSchema>;

const emptyValues: InventoryExtraValues = {
  weight: "",
  neck_size: "",
  qty_per_box: "",
  box_dimension: "",
  reorder_level: "",
};

function numberToInput(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  return String(value);
}

function parseOptionalNumber(
  value: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: `${label} must be a number` };
  }
  return { ok: true, value: parsed };
}

function valuesFromItem(item: InventoryMasterItem): InventoryExtraValues {
  return {
    weight: numberToInput(item.weight),
    neck_size: numberToInput(item.neck_size),
    qty_per_box: numberToInput(item.qty_per_box),
    box_dimension: item.box_dimension ?? "",
    reorder_level: numberToInput(item.reorder_level),
  };
}

function patchInventoryCache(
  current: InventoryMasterItem[] | undefined,
  updated: InventoryMasterItem,
) {
  return (current ?? []).map((item) =>
    item.stock_item === updated.stock_item ? updated : item,
  );
}

export function InventoryMasterPage() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFormMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedItem, setSelectedItem] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [carouselIndex, setCarouselIndex] = useState(0);

  const inventoryQuery = useQuery({
    queryKey: ["inventory-master"],
    queryFn: () => inventoryMasterService.list(),
  });

  const items = inventoryQuery.data ?? [];

  const stockItemOptions = useMemo(
    () =>
      items
        .map((item) => item.stock_item.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [items],
  );

  useEffect(() => {
    if (
      selectedItem &&
      !stockItemOptions.some((option) => option.value === selectedItem)
    ) {
      setSelectedItem("");
    }
  }, [selectedItem, stockItemOptions]);

  const selected = useMemo(
    () => items.find((item) => item.stock_item === selectedItem) ?? null,
    [items, selectedItem],
  );

  const images = selected?.images ?? [];

  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedItem]);

  useEffect(() => {
    if (images.length === 0) {
      setCarouselIndex(0);
      return;
    }
    if (carouselIndex >= images.length) {
      setCarouselIndex(images.length - 1);
    }
  }, [images.length, carouselIndex]);

  const activeImage = images[carouselIndex] ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryExtraValues>({
    resolver: zodResolver(inventoryExtraSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    setFieldError(undefined);
    reset(selected ? valuesFromItem(selected) : emptyValues);
  }, [selected, reset]);

  const validationMessage =
    fieldError ??
    errors.weight?.message ??
    errors.neck_size?.message ??
    errors.qty_per_box?.message ??
    errors.box_dimension?.message ??
    errors.reorder_level?.message;

  const saveMutation = useMutation({
    mutationFn: inventoryMasterService.upsertExtra,
    onSuccess: (updated) => {
      queryClient.setQueryData<InventoryMasterItem[]>(
        ["inventory-master"],
        (current) => patchInventoryCache(current, updated),
      );
      showSuccess("Inventory details saved.");
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to save inventory details");
    },
  });

  const imageMutation = useMutation({
    mutationFn: ({ stockItem, file }: { stockItem: string; file: File }) =>
      inventoryMasterService.uploadImage(stockItem, file),
    onSuccess: (updated) => {
      queryClient.setQueryData<InventoryMasterItem[]>(
        ["inventory-master"],
        (current) => patchInventoryCache(current, updated),
      );
      setCarouselIndex(Math.max(0, updated.images.length - 1));
      showSuccess("Image uploaded.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to upload image");
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: inventoryMasterService.deleteImage,
    onSuccess: (updated) => {
      queryClient.setQueryData<InventoryMasterItem[]>(
        ["inventory-master"],
        (current) => patchInventoryCache(current, updated),
      );
      showSuccess("Image removed.");
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to remove image");
    },
  });

  const fieldsDisabled = !selected || inventoryQuery.isLoading;
  const atImageLimit = images.length >= MAX_INVENTORY_IMAGES;
  const canUpload = Boolean(selected) && !fieldsDisabled && !atImageLimit;

  return (
    <section>
      <PageHeader
        items={[
          { label: "Master" },
          { label: "Inventory", to: "/master/inventory" },
        ]}
      />

      <FormPanel
        hideHeader
        wide
        onSubmit={handleSubmit((values) => {
          if (!selected) {
            setFieldError("Select a stock item");
            return;
          }
          const weight = parseOptionalNumber(values.weight, "Weight");
          if (!weight.ok) {
            setFieldError(weight.message);
            return;
          }
          const neck = parseOptionalNumber(values.neck_size, "Neck size");
          if (!neck.ok) {
            setFieldError(neck.message);
            return;
          }
          const qtyPerBox = parseOptionalNumber(
            values.qty_per_box,
            "Qty per box",
          );
          if (!qtyPerBox.ok) {
            setFieldError(qtyPerBox.message);
            return;
          }
          const reorder = parseOptionalNumber(
            values.reorder_level,
            "Reorder level",
          );
          if (!reorder.ok) {
            setFieldError(reorder.message);
            return;
          }
          setFieldError(undefined);
          saveMutation.mutate({
            stock_item: selected.stock_item,
            weight: weight.value,
            neck_size: neck.value,
            qty_per_box: qtyPerBox.value,
            box_dimension: values.box_dimension.trim() || null,
            reorder_level: reorder.value,
          });
        })}
        footerMessage={validationMessage}
        footer={
          <button
            type="submit"
            className={defaultWinForm.buttonPrimary}
            disabled={
              fieldsDisabled || isSubmitting || saveMutation.isPending
            }
          >
            {saveMutation.isPending ? "Saving…" : "Save details"}
          </button>
        }
      >
        <div className="inventory-master-form">
          <div className="inventory-master-form__item grid gap-x-3 sm:grid-cols-2">
            <FormField label="Stock item">
              <FormAutocomplete
                value={selectedItem}
                onChange={setSelectedItem}
                options={stockItemOptions}
                placeholder="Search stock item"
                emptyMessage="No stock items"
                disabled={inventoryQuery.isLoading}
              />
            </FormField>
            <FormInput
              label="Stock group"
              value={selected?.stock_group?.trim() || ""}
              placeholder={selected ? "—" : "Select a stock item"}
              readOnly
            />
          </div>

          <div className="inventory-master-image">
            <div className="inventory-master-image__frame">
              {activeImage ? (
                <img
                  src={activeImage.url}
                  alt={`${selected?.stock_item ?? "Stock item"} ${carouselIndex + 1}`}
                  className="inventory-master-image__preview"
                />
              ) : (
                <div className="inventory-master-image__placeholder">
                  {selected ? "No images" : "Select a stock item"}
                </div>
              )}

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="inventory-master-image__nav inventory-master-image__nav--prev"
                    aria-label="Previous image"
                    onClick={() =>
                      setCarouselIndex(
                        (index) =>
                          (index - 1 + images.length) % images.length,
                      )
                    }
                  >
                    <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="inventory-master-image__nav inventory-master-image__nav--next"
                    aria-label="Next image"
                    onClick={() =>
                      setCarouselIndex((index) => (index + 1) % images.length)
                    }
                  >
                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            {images.length > 0 ? (
              <div className="inventory-master-image__dots" role="tablist">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    role="tab"
                    aria-selected={index === carouselIndex}
                    aria-label={`Image ${index + 1}`}
                    className={[
                      "inventory-master-image__dot",
                      index === carouselIndex
                        ? "inventory-master-image__dot--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setCarouselIndex(index)}
                  />
                ))}
              </div>
            ) : null}

            <div className="inventory-master-image__actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                id="inventory-image-upload"
                disabled={!canUpload || imageMutation.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || !selected) {
                    return;
                  }
                  imageMutation.mutate({
                    stockItem: selected.stock_item,
                    file,
                  });
                }}
              />
              <label
                htmlFor="inventory-image-upload"
                className={[
                  defaultWinForm.button,
                  !canUpload || imageMutation.isPending
                    ? "pointer-events-none opacity-50"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {imageMutation.isPending
                  ? "Uploading…"
                  : atImageLimit
                    ? `Max ${MAX_INVENTORY_IMAGES} images`
                    : "Upload image"}
              </label>
              {activeImage ? (
                <button
                  type="button"
                  className={defaultWinForm.button}
                  disabled={deleteImageMutation.isPending}
                  onClick={() => deleteImageMutation.mutate(activeImage.id)}
                >
                  Remove
                </button>
              ) : null}
              {images.length > 0 ? (
                <span className="inventory-master-image__count">
                  {carouselIndex + 1} / {images.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="inventory-master-form__fields">
            <div className="grid gap-x-3 sm:grid-cols-2">
              <FormInput
                label="Weight"
                inputMode="decimal"
                disabled={fieldsDisabled}
                error={errors.weight?.message}
                hideErrorText
                {...register("weight")}
              />
              <FormInput
                label="Neck size"
                inputMode="decimal"
                disabled={fieldsDisabled}
                error={errors.neck_size?.message}
                hideErrorText
                {...register("neck_size")}
              />
            </div>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <FormInput
                label="Qty per box"
                inputMode="decimal"
                disabled={fieldsDisabled}
                error={errors.qty_per_box?.message}
                hideErrorText
                {...register("qty_per_box")}
              />
              <FormInput
                label="Box dimension"
                disabled={fieldsDisabled}
                error={errors.box_dimension?.message}
                hideErrorText
                {...register("box_dimension")}
              />
            </div>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <FormInput
                label="Reorder level"
                inputMode="decimal"
                disabled={fieldsDisabled}
                error={errors.reorder_level?.message}
                hideErrorText
                {...register("reorder_level")}
              />
            </div>
          </div>
        </div>
      </FormPanel>
    </section>
  );
}
