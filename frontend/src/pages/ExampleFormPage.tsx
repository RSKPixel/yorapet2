import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  FormInput,
  FormPanel,
  FormSelect,
  FormTextarea,
  defaultWinForm,
} from "@/components/forms";
import { DocumentTextIcon } from "@/components/forms/formIcons";
import { PageHeader } from "@/components/ui/PageHeader";

const exampleFormSchema = z.object({
  fullName: z.string().trim().min(2, "Enter at least 2 characters"),
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
  category: z.enum(["general", "support", "billing"]),
});

type ExampleFormValues = z.infer<typeof exampleFormSchema>;

export function ExampleFormPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
    reset,
  } = useForm<ExampleFormValues>({
    resolver: zodResolver(exampleFormSchema),
    defaultValues: {
      fullName: "",
      notes: "",
      category: "general",
    },
  });

  const validationMessage =
    errors.fullName?.message ?? errors.category?.message ?? errors.notes?.message;

  return (
    <section>
      <PageHeader items={[{ label: "Home", to: "/" }, { label: "Example Form" }]} />

      <FormPanel
        title="Example form"
        titleIcon={DocumentTextIcon}
        onSubmit={handleSubmit(() => {
          reset();
        })}
        footerMessage={validationMessage}
        footer={
          <button type="submit" className={defaultWinForm.buttonPrimary}>
            Submit placeholder
          </button>
        }
      >
        <FormInput
          label="Full name"
          error={errors.fullName?.message}
          hideErrorText
          {...register("fullName")}
        />
        <FormSelect
          label="Category"
          options={[
            { label: "General", value: "general" },
            { label: "Support", value: "support" },
            { label: "Billing", value: "billing" },
          ]}
          error={errors.category?.message}
          hideErrorText
          {...register("category")}
        />
        <FormTextarea
          label="Notes"
          error={errors.notes?.message}
          hideErrorText
          {...register("notes")}
        />
        {isSubmitSuccessful ? (
          <p className="text-sm text-[var(--color-accent)]" role="status">
            Placeholder submit succeeded. No API call was made.
          </p>
        ) : null}
      </FormPanel>
    </section>
  );
}
