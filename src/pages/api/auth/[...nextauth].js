import NextAuth from "next-auth";
import GoogleProvider from 'next-auth/providers/google'

export default NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?prompt=consent&access_type=offline&response_type=code',
            scope:'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
        })
    ],
    jwt: {
        encryption: true
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt(token, user, account, profile, isNewUser) {
            // console.log(token, account, profile);
            if (account?.accessToken) {
                token.accessToken = account.accessToken;
            }
            if (!token.email.endsWith('@sonder.io')) {
                return null;
            }
            return token;
        },
        
    }
});