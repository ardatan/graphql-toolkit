import { loadDocuments } from "@graphql-toolkit/core"
import { join } from "path"
import { GraphQLFileLoader } from "@graphql-toolkit/graphql-file-loader"
import { parse, print } from "graphql";

function normalizeDocumentString(doc: any): string {
    if (typeof doc === 'string') {
        doc = parse(doc.replace(/\s+/g, ' ').trim(), { noLocation: true });
    }
    doc.definitions = doc.definitions.sort((a, b) => {
        const aStr = 'name' in a ? a.name.value : a.kind;
        const bStr = 'name' in b ? b.name.value : b.kind;
        return aStr.localeCompare(bStr);
    })
    return print(doc);
}

describe('import in documents', () => {

    it('should get documents with default imports properly', async () => {
        const [{ document }] = await loadDocuments(join(__dirname, './import-test/default/a.graphql'), {
            loaders: [new GraphQLFileLoader()],
        });

        expect(normalizeDocumentString(document)).toBe(normalizeDocumentString(/* GraphQL */`
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
    `));
    })
    it('should get documents with specific imports properly', async () => {
        const [{ document }] = await loadDocuments(join(__dirname, './import-test/specific/a.graphql'), {
            loaders: [new GraphQLFileLoader()]
        });

        expect(normalizeDocumentString(document)).toBe(normalizeDocumentString(/* GraphQL */`
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
        `));
    })
})