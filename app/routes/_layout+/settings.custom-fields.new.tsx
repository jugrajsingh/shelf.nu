import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useAtomValue } from "jotai";

import { dynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import {
  CustomFieldForm,
  NewCustomFieldFormSchema,
} from "~/components/custom-fields/form";
import Header from "~/components/layout/header";

import { createCustomField } from "~/modules/custom-field/service.server";
import { assertUserCanCreateMoreCustomFields } from "~/modules/tier/service.server";
import { data, error, makeShelfError, parseData } from "~/utils";

import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { PermissionAction, PermissionEntity } from "~/utils/permissions";
import { requirePermission } from "~/utils/roles.server";

const title = "New Custom Field";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId, organizations } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.customField,
      action: PermissionAction.create,
    });

    await assertUserCanCreateMoreCustomFields({
      organizations,
      organizationId,
    });

    const header = {
      title,
    };

    return json(
      data({
        header,
      })
    );
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw json(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export const handle = {
  breadcrumb: () => <span>{title}</span>,
};

export async function action({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId, organizations } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.customField,
      action: PermissionAction.create,
    });

    await assertUserCanCreateMoreCustomFields({
      organizations,
      organizationId,
    });

    const payload = parseData(
      await request.formData(),
      NewCustomFieldFormSchema
    );

    const { name, helpText, required, type, active, options } = payload;

    await createCustomField({
      name,
      helpText,
      required,
      type,
      active,
      organizationId,
      userId: authSession.userId,
      options,
    });

    sendNotification({
      title: "Custom Field created",
      message: "Your Custom Field has been created successfully",
      icon: { name: "success", variant: "success" },
      senderId: userId,
    });

    return redirect(`/settings/custom-fields`);
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return json(error(reason), { status: reason.status });
  }
}

export default function NewCustomFieldPage() {
  const title = useAtomValue(dynamicTitleAtom);

  return (
    <>
      <Header
        hideBreadcrumbs
        title={title ? title : "Untitled custom field"}
        classNames="-mt-5"
      />
      <div>
        <CustomFieldForm />
      </div>
    </>
  );
}
