import { gql } from "apollo-server-express";

export default gql`
  type DeleteCommentMutation {
    ok: Boolean!
    error: String
  }
  type Mutation {
    deleteComment(id: Int!): DeleteCommentMutation!
  }
`;
