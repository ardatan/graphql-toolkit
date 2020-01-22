import { loadDocuments } from "@graphql-toolkit/core"
import { join } from "path"
import { GraphQLFileLoader } from "@graphql-toolkit/graphql-file-loader"
import { parse, print } from "graphql";
import '../../../../testing/to-be-similar-gql-doc';

describe('import in documents', () => {

    it('should get documents with default imports properly', async () => {
        const [{ document }] = await loadDocuments(join(__dirname, './import-test/default/a.graphql'), {
            loaders: [new GraphQLFileLoader()],
        });

        expect(print(document)).toBeSimilarGqlDoc(/* GraphQL */`
            query FooQuery {
                foo {
                    ...FooFragment
                }
            }

            fragment FooFragment on Foo {
                bar {
                    ...BarFragment
                }
            }

            fragment BarFragment on Bar {
                baz
            }
    `);
    })
    it('should get documents with specific imports properly', async () => {
        const [{ document }] = await loadDocuments(join(__dirname, './import-test/specific/a.graphql'), {
            loaders: [new GraphQLFileLoader()]
        });

        expect(print(document)).toBeSimilarGqlDoc(/* GraphQL */`
                query FooQuery {
                    foo {
                        ...FooFragment
                    }
                }

                fragment FooFragment on Foo {
                    bar {
                        ...BarFragment
                    }
                }
                fragment BarFragment on Bar {
                    baz
                }
        `);
    })
})