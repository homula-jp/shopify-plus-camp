import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import indexStyles from "./_index/style.css";
import db from "~/db.server";
import crypto from "crypto";
import type { Data } from "~/types/remix";

const getSecret = async (
  request: ActionFunctionArgs["request"],
  shop: string
) => {
  const shopRecord = await db.multipassSecret.findFirst({
    where: { shop },
  });
  return shopRecord?.secret ?? undefined;
  // const response = await fetch(
  //   `https://${shop}/admin/api/2023-10/metafields.json`,
  //   {
  //     method: "GET",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "X-Shopify-Access-Token": API_SECRET,
  //     },
  //   }
  // );
  // const result = await response.json();

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

const generateMultipassToken = function (json: any, secret: string) {
  const str = JSON.stringify(json);
  const keyMaterial = crypto.createHash("sha256").update(secret).digest();
  const encryptionKey = keyMaterial.slice(0, 16);
  const signatureKey = keyMaterial.slice(16, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-128-cbc", encryptionKey, iv);
  const cipherText = Buffer.concat([
    iv,
    cipher.update(str, "utf8"),
    cipher.final(),
  ]);
  const signed = crypto
    .createHmac("SHA256", signatureKey)
    .update(cipherText)
    .digest();
  const token = Buffer.concat([cipherText, signed])
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  console.log(`generateMultipassToken token ${token}`);
  return token;
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.clone().formData();
  const shop = formData.get("shop") as string;
  const shopId = formData.get("shopId") as string;

  const email = formData.get("email") as string;
  const identifier = formData.get("identifier") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const tag_string = formData.get("tag_string") as string;
  const remote_ip = formData.get("remote_ip") as string;
  const return_to = formData.get("return_to") as string;
  const multipassJson = {
    email,
    // identifier,
    // first_name,
    // last_name,
    // tag_string,
    // remote_ip,
    // return_to,
    created_at: new Date().toISOString(),
  };

  const secret = await getSecret(request, shopId);
  const token = generateMultipassToken(multipassJson, secret ?? "");

  const url = `https://${shop}/account/login/multipass/${token}`;
  return redirect(url);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  return json({
    shop: url.searchParams.get("shop"),
    shopId: url.searchParams.get("shop_id"),
  });
};

// export const links = () => [{ rel: "stylesheet", href: indexStyles }];

export default function Multipass() {
  const data = useLoaderData<typeof loader>() as Data<typeof loader>;

  return (
    <div className="index">
      <div className="content">
        <h1>Multipass test</h1>
        <Form method="post" action="/multipass">
          <fieldset>
            <div className="input">
              <label htmlFor="email">
                <b>Email*:</b>
              </label>
              <br />
              <input
                type="text"
                name="email"
                id="email"
                placeholder="test@example.com"
              />
            </div>
            {/* <div className="input">
              <label htmlFor="identifier">Identifier:</label>
              <br />
              <input
                type="text"
                name="identifier"
                id="identifier"
                placeholder="nic123"
              />
            </div>
            <div className="input">
              <label htmlFor="password">Password:</label>
              <br />
              <input
                type="text"
                name="password"
                id="password"
                disabled={true}
                value="Note that you don't have to give your password to Multipass!"
              />
            </div>
            <div className="input">
              <label htmlFor="first_name">First name:</label>
              <br />
              <input
                type="text"
                name="first_name"
                id="first_name"
                placeholder="Nic"
              />
            </div>
            <div className="input">
              <label htmlFor="last_name">Last name:</label>
              <br />
              <input
                type="text"
                name="last_name"
                id="last_name"
                placeholder="Potts"
              />
            </div>
            <div className="input">
              <label htmlFor="tag_string">Tags separated by ",":</label>
              <br />
              <input
                type="text"
                name="tag_string"
                id="tag_string"
                placeholder="canadian, premium"
              />
            </div>
            <div className="input">
              <label htmlFor="remote_ip">Remote IP:</label>
              <br />
              <input
                type="text"
                name="remote_ip"
                id="remote_ip"
                placeholder="107.20.160.121"
              />
            </div>
            <div className="input">
              <label htmlFor="return_to">URL to return:</label>
              <br />
              <input
                type="text"
                name="return_to"
                id="return_to"
                placeholder="http://your_store_or_some_specific_site"
              />
            </div> */}
          </fieldset>
          <p>
            <button type="submit">ログイン</button>
          </p>
          <input
            type="hidden"
            name="shop"
            value={(data.shop as string) ?? undefined}
            id="shop"
          />
          <input
            type="hidden"
            name="shopId"
            value={(data.shopId as string) ?? undefined}
            id="shopId"
          />
        </Form>
      </div>
    </div>
  );
}
