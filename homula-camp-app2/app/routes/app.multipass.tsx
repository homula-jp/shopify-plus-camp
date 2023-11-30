import { json, redirect } from "@remix-run/node";
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
  Link,
  List,
  Page,
  TextField,
} from "@shopify/polaris";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { authenticate } from "~/shopify.server";
import type { Data } from "~/types/remix";

const getSecret = async (request: ActionFunctionArgs["request"]) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query {
        shop {
          id
          metafield(namespace: "multipass", key: "secret") {
            value
          }
        }
      }
    `
  );
  const responseJson = await response.json();
  return responseJson.data.shop.metafield.value;
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
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        metafields: [
          {
            key: "secret",
            namespace: "multipass",
            ownerId: shopId,
            type: "single_line_text_field",
            value: secret,
          },
        ],
      },
    }
  );

  const responseJson = await response.json();

  return json(responseJson.data.metafieldsSet);
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.clone().formData();
  const shopId = await getShopId(request);
  const secret = formData.get("secret") as string;

  return await updateMultipassSecret(request, shopId, secret);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return await getSecret(request);
};

export default function Multipass() {
  const data = useLoaderData<typeof loader>() as Data<typeof loader>;
  const [secret, setSecret] = useState(data);
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
                    <Button submit variant="primary" loading={isLoading}>
                      Secretを保存
                    </Button>
                  </div>
                  <div>
                    <Link
                      onClick={() => {
                        redirect(
                          `https://${window.location.hostname}/multipass?login_shop=${shop}`
                        );
                      }}
                    >
                      ログインページ
                    </Link>
                  </div>
                </BlockStack>
              </Form>
            </Layout.Section>
          </Layout>
        </Card>
        {actionData && (
          <Card>
            <Layout>
              <Layout.Section>
                <BlockStack gap="500">
                  {actionData.metafields.map((metafield: any) => (
                    <div key={metafield.key}>
                      {metafield.key}を更新しました。
                    </div>
                  ))}
                  {actionData.userErrors.map((error: any) => (
                    <div key={error.field}>{error.message}</div>
                  ))}
                </BlockStack>
              </Layout.Section>
            </Layout>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
