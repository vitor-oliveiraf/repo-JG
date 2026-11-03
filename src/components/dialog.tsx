import { lazy, Suspense, type ComponentProps } from "react";
type DialogProps = ComponentProps<typeof import("./ui/dialog").Dialog>;
const DialogContent = lazy(() =>
  import("./ui/dialog").then((module) => ({ default: module.Dialog })),
);

export function Dialog(props: DialogProps) {
  if (!props.open) return null;
  return (
    <Suspense
      fallback={
        <div className="dialog-loading" role="status">
          Abrindo…
        </div>
      }
    >
      <DialogContent {...props} />
    </Suspense>
  );
}
