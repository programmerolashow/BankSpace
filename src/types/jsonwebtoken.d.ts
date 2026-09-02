declare module "jsonwebtoken" {
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: any, options?: any): string
  export function verify(token: string, secretOrPublicKey: any, options?: any): any
  export function decode(token: string, options?: any): any
  const jwt: any
  export default jwt
}
