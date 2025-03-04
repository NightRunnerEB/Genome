use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(AccountSize)]
pub fn account_size_derive(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    let struct_name = &ast.ident;

    let gen = quote! {
        impl #struct_name {
            pub fn get_account_size() -> usize {
                8 + borsh::to_vec(&Self::default())
                    .expect("Expected struct to be serializable")
                    .len()
            }
        }
    };

    gen.into()
}
