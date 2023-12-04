import {defer, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, useLoaderData, Link, type MetaFunction} from '@remix-run/react';
import {Suspense} from 'react';
import {Image, Money} from '@shopify/hydrogen';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;
  const newProducts = storefront.query(NEW_PRODUCTS_QUERY);

  return defer({newProducts});
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home space-y-8">
      <h2 className="font-bold text-teal-600 text-xl">
        Products created after 2023-02-03T18:00:00Z
      </h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={data.newProducts}>
          {({products}) => (
            <div className="grid grid-cols-3 gap-4">
              {products.nodes.map((product) => (
                <div key={product.id}>
                  <Link
                    key={product.id}
                    className="recommended-product block hover:shadow-lg hover:shadow-gray hover:no-underline py-6"
                    to={`/products/${product.handle}`}
                  >
                    <h4 className="font-bold">{product.title}</h4>
                    <div>createdAt: {product.createdAt}</div>
                    <Image
                      data={product.images.nodes[0]}
                      aspectRatio="1/1"
                      sizes="(min-width: 45em) 20vw, 50vw"
                    />
                    <small>
                      <Money data={product.priceRange.minVariantPrice} />
                    </small>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

const NEW_PRODUCTS_QUERY = `#graphql
  fragment NewProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    createdAt
  }
  query NewProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 10, sortKey: CREATED_AT, reverse: true, query: "created_at:>'2023-02-03T18:00:00'") {
      nodes {
        ...NewProduct
      }
    }
  }
` as const;
