import { json, redirect } from "@remix-run/node";
import { v4 as uuid } from "uuid";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { SubmitFunction } from "@remix-run/react";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  Form,
  Layout,
  Page,
  TextField,
} from "@shopify/polaris";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { authenticate } from "~/shopify.server";
import type { Data } from "~/types/remix";
import db from "~/db.server";

const getSecret = async (request: ActionFunctionArgs["request"]) => {
  const shop = await getShopId(request);
  const shopRecord = await db.multipassSecret.findFirst({
    where: { shop },
  });
  return shopRecord?.secret ?? undefined;
  // const { admin } = await authenticate.admin(request);
  // const response = await admin.graphql(
  //   `#graphql
  //     query {
  //       shop {
  //         id
  //         metafield(namespace: "multipass", key: "secret") {
  //           value
  //         }
  //       }
  //     }
  //   `
  // );
  // const responseJson = await response.json();
  // return responseJson.data.shop.metafield.value;
};

const getShopId = async (request: ActionFunctionArgs["request"]) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query {
        shop {
          id
        }
      }
    `
  );
  const responseJson = await response.json();
  return responseJson.data.shop.id;
};

const updateMultipassSecret = async (
  request: ActionFunctionArgs["request"],
  shopId: string,
  secret: string
) => {
  const record = await db.multipassSecret.findFirst({
    where: { shop: shopId },
  });
  if (record) {
    const newRecord = await db.multipassSecret.update({
      where: { id: record?.id },
      data: { secret },
    });
    return newRecord.secret;
  }
  const newRecord = await db.multipassSecret.create({
    data: { id: uuid(), shop: shopId, secret },
  });
  return newRecord;
  // const { admin } = await authenticate.admin(request);
  // const response = await admin.graphql(
  //   `#graphql
  //     mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  //       metafieldsSet(metafields: $metafields) {
  //         metafields {
  //           key
  //           value
  //         }
  //         userErrors {
  //           field
  //           message
  //         }
  //       }
  //     }
  //   `,
  //   {
  //     variables: {
  //       metafields: [
  //         {
  //           key: "secret",
  //           namespace: "multipass",
  //           ownerId: shopId,
  //           type: "single_line_text_field",
  //           value: secret,
  //         },
  //       ],
  //     },
  //   }
  // );

  // const responseJson = await response.json();

  // return json(responseJson.data.metafieldsSet);
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.clone().formData();
  const shopId = await getShopId(request);
  const _action = formData.get("_action") as string;
  const secret = formData.get("secret") as string;

  if (_action === "UPDATE_SECRET") {
    return await updateMultipassSecret(request, shopId, secret);
  }

  if (_action === "LOGIN") {
    const { redirect } = await authenticate.admin(request);
    const formData = await request.clone().formData();
    const url = formData.get("url") as string;
    return redirect(url, { target: "_parent" });
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    secret: await getSecret(request),
    shopId: await getShopId(request),
  });
};

export default function Multipass() {
  const data = useLoaderData<typeof loader>() as Data<typeof loader>;
  const [secret, setSecret] = useState(data.secret ?? "");
  const nav = useNavigation();
  const submit = useSubmit();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  const submitAction = (target: Parameters<SubmitFunction>[0]) =>
    submit(target, { replace: true, method: "POST" });
  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitAction(event.currentTarget);
    },
    [submitAction]
  );
  const actionData = useActionData<typeof action>() as Data<typeof action>;

  return (
    <Page title="Multipass">
      <BlockStack gap="500">
        <Card>
          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
                <Form onSubmit={onSubmit}>
                  <BlockStack gap="500">
                    <TextField
                      label="Multipass secret"
                      value={secret}
                      name="secret"
                      onChange={setSecret}
                      autoComplete="off"
                    />
                    <div>
                      <input
                        type="hidden"
                        name="_action"
                        value="UPDATE_SECRET"
                      />
                      <Button submit variant="primary" loading={isLoading}>
                        Secretを保存
                      </Button>
                    </div>
                  </BlockStack>
                </Form>
                <div>
                  <Form
                    onSubmit={(event) => {
                      const formData = new FormData(event.currentTarget);
                      const shop = new URLSearchParams(
                        window.location.search
                      ).get("shop");
                      const url = `https://${window.location.hostname}/multipass?login_shop=${shop}&shop_id=${data.shopId}`;
                      formData.append("url", url);
                      console.log(url);
                      submitAction(formData);
                    }}
                  >
                    <input type="hidden" name="_action" value="LOGIN" />
                    <Button submit variant="primary" loading={isLoading}>
                      ログインページを開く
                    </Button>
                  </Form>
                </div>
              </BlockStack>
            </Layout.Section>
          </Layout>
        </Card>
        {actionData && (
          <Card>
            <Layout>
              <Layout.Section>
                <BlockStack gap="500">
                  {actionData && <div>Secretを更新しました。</div>}
                </BlockStack>
              </Layout.Section>
            </Layout>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
